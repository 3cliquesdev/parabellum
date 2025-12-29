import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useBuscaCep } from "@/hooks/useBuscaCep";
import { validateDocument, formatDocument, formatCEP } from "@/lib/validators";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, MapPin, FileText, Building2 } from "lucide-react";

const fiscalDataSchema = z.object({
  customer_type: z.enum(["pf", "pj"], { required_error: "Selecione o tipo" }),
  document: z.string().min(1, "CPF/CNPJ é obrigatório").refine((val) => {
    const result = validateDocument(val);
    return result.valid;
  }, "CPF/CNPJ inválido"),
  zip_code: z.string().min(8, "CEP é obrigatório").max(9),
  address: z.string().min(1, "Endereço é obrigatório"),
  address_number: z.string().min(1, "Número é obrigatório"),
  address_complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório").max(2),
  state_registration: z.string().optional(),
});

type FiscalDataForm = z.infer<typeof fiscalDataSchema>;

export default function CustomerFiscalData() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { buscarCep, isLoading: isLoadingCep } = useBuscaCep();
  
  const contactId = searchParams.get("contact_id");
  const returnUrl = searchParams.get("return") || "/";
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [contactName, setContactName] = useState("");

  const form = useForm<FiscalDataForm>({
    resolver: zodResolver(fiscalDataSchema),
    defaultValues: {
      customer_type: "pf",
      document: "",
      zip_code: "",
      address: "",
      address_number: "",
      address_complement: "",
      neighborhood: "",
      city: "",
      state: "",
      state_registration: "",
    },
  });

  const customerType = form.watch("customer_type");

  useEffect(() => {
    async function loadContact() {
      if (!contactId) {
        toast({
          title: "Erro",
          description: "ID do contato não informado",
          variant: "destructive",
        });
        return;
      }

      try {
        const { data, error } = await supabase
          .from("contacts")
          .select("*")
          .eq("id", contactId)
          .single();

        if (error) throw error;

        if (!data) {
          toast({
            title: "Erro",
            description: "Contato não encontrado",
            variant: "destructive",
          });
          return;
        }

        setContactName(`${data.first_name || ""} ${data.last_name || ""}`.trim());

        // Preencher formulário com dados existentes
        if (data.customer_type) {
          form.setValue("customer_type", data.customer_type === "PJ" || data.customer_type === "pj" ? "pj" : "pf");
        }
        if (data.document) form.setValue("document", formatDocument(data.document));
        if (data.zip_code) form.setValue("zip_code", formatCEP(data.zip_code));
        if (data.address) form.setValue("address", data.address);
        if (data.address_number) form.setValue("address_number", data.address_number);
        if (data.address_complement) form.setValue("address_complement", data.address_complement);
        if (data.neighborhood) form.setValue("neighborhood", data.neighborhood);
        if (data.city) form.setValue("city", data.city);
        if (data.state) form.setValue("state", data.state);
        if (data.state_registration) form.setValue("state_registration", data.state_registration);

        // Verificar se dados fiscais já estão completos
        const hasDocument = !!data.document;
        const hasAddress = !!data.zip_code && !!data.address && !!data.city && !!data.state;
        if (hasDocument && hasAddress) {
          setIsComplete(true);
        }
      } catch (error: any) {
        console.error("Erro ao carregar contato:", error);
        toast({
          title: "Erro",
          description: error.message || "Erro ao carregar dados",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadContact();
  }, [contactId, toast, form]);

  const handleCepBlur = async () => {
    const cep = form.getValues("zip_code");
    if (cep.replace(/\D/g, "").length === 8) {
      const result = await buscarCep(cep);
      if (result) {
        form.setValue("address", result.address);
        form.setValue("neighborhood", result.neighborhood);
        form.setValue("city", result.city);
        form.setValue("state", result.state);
        form.setValue("zip_code", formatCEP(result.cep));
      }
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    form.setValue("document", formatDocument(value));
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    form.setValue("zip_code", formatCEP(value));
  };

  const onSubmit = async (data: FiscalDataForm) => {
    if (!contactId) return;

    setIsSaving(true);
    try {
      const cleanDocument = data.document.replace(/\D/g, "");
      const cleanCep = data.zip_code.replace(/\D/g, "");

      const { error } = await supabase
        .from("contacts")
        .update({
          customer_type: data.customer_type.toUpperCase(),
          document: cleanDocument,
          zip_code: cleanCep,
          address: data.address,
          address_number: data.address_number,
          address_complement: data.address_complement || null,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state.toUpperCase(),
          state_registration: data.state_registration || null,
        })
        .eq("id", contactId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Seus dados fiscais foram salvos com sucesso.",
      });

      setIsComplete(true);

      // Redirecionar após 2 segundos
      setTimeout(() => {
        if (returnUrl.startsWith("/")) {
          navigate(returnUrl);
        } else {
          window.location.href = returnUrl;
        }
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar dados",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Dados Salvos!</h2>
            <p className="text-muted-foreground">
              Seus dados fiscais foram atualizados com sucesso. Você será redirecionado em instantes...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Dados Fiscais</CardTitle>
            <CardDescription>
              {contactName && <span className="font-medium">{contactName}, </span>}
              precisamos dos seus dados para emissão da Nota Fiscal
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Tipo de Cliente */}
                <FormField
                  control={form.control}
                  name="customer_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Cliente</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pf" id="pf" />
                            <Label htmlFor="pf" className="flex items-center gap-2 cursor-pointer">
                              <FileText className="h-4 w-4" />
                              Pessoa Física
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pj" id="pj" />
                            <Label htmlFor="pj" className="flex items-center gap-2 cursor-pointer">
                              <Building2 className="h-4 w-4" />
                              Pessoa Jurídica
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* CPF/CNPJ */}
                <FormField
                  control={form.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{customerType === "pj" ? "CNPJ" : "CPF"}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={customerType === "pj" ? "00.000.000/0000-00" : "000.000.000-00"}
                          onChange={handleDocumentChange}
                          maxLength={customerType === "pj" ? 18 : 14}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Inscrição Estadual (apenas PJ) */}
                {customerType === "pj" && (
                  <FormField
                    control={form.control}
                    name="state_registration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inscrição Estadual</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Opcional" />
                        </FormControl>
                        <FormDescription>
                          Deixe em branco se for isento
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                    <MapPin className="h-5 w-5" />
                    Endereço
                  </h3>

                  {/* CEP */}
                  <FormField
                    control={form.control}
                    name="zip_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              {...field}
                              placeholder="00000-000"
                              onChange={handleCepChange}
                              onBlur={handleCepBlur}
                              maxLength={9}
                              className="max-w-[140px]"
                            />
                            {isLoadingCep && <Loader2 className="h-5 w-5 animate-spin self-center" />}
                          </div>
                        </FormControl>
                        <FormDescription>
                          Digite o CEP para preencher automaticamente
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 mt-4">
                    {/* Endereço */}
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Rua, Avenida..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      {/* Número */}
                      <FormField
                        control={form.control}
                        name="address_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="123" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Complemento */}
                      <FormField
                        control={form.control}
                        name="address_complement"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Complemento</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Apto, Bloco..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Bairro */}
                    <FormField
                      control={form.control}
                      name="neighborhood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Centro" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      {/* Cidade */}
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="São Paulo" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Estado */}
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>UF</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="SP" 
                                maxLength={2}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Dados Fiscais"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
